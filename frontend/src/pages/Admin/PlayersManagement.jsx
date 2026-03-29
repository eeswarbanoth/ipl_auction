import { useState, useEffect } from 'react';
import { Plus, Trash2, Search, Edit2, Upload, FileSpreadsheet, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import { formatCurrency } from '../../utils/format';

export default function PlayersManagement() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', category: 'Marquee', basePrice: '', rating: 50 });
  const [unit, setUnit] = useState('Cr');

  // Excel Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [isImporting, setIsImporting] = useState(false);

  const categories = ['Marquee', 'Batsmen', 'Wicket Keepers', 'All Rounders', 'Bowlers', 'Uncapped'];

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const res = await api.get('/players');
      setPlayers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const parsePrice = (priceStr) => {
    if (typeof priceStr !== 'string') return parseFloat(priceStr) || 0;
    const cleanStr = priceStr.toLowerCase().replace(/,/g, '').trim();
    const num = parseFloat(cleanStr);
    if (isNaN(num)) return 0;

    if (cleanStr.includes('cr')) return num * 10000000;
    if (cleanStr.includes('lakh') || cleanStr.includes('lac')) return num * 100000;
    
    return num; 
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      const normalized = data.map(row => {
        const findKey = (keys) => {
          const found = Object.keys(row).find(k => keys.some(target => k.toLowerCase().includes(target.toLowerCase())));
          return found ? row[found] : null;
        };

        const name = findKey(['name', 'player']);
        let category = findKey(['category', 'type', 'role']) || 'Uncapped';
        const validCategories = ['Marquee', 'Batsmen', 'Wicket Keepers', 'All Rounders', 'Bowlers', 'Uncapped'];
        const foundCat = validCategories.find(c => category.toString().toLowerCase().includes(c.toLowerCase()));
        category = foundCat || 'Uncapped';

        const rawPrice = findKey(['price', 'base']);
        const basePrice = parsePrice(rawPrice?.toString());
        
        const rating = parseInt(findKey(['rating', 'score'])) || 50;

        return { name, category, basePrice, rating };
      }).filter(p => p.name);

      setImportPreview(normalized);
    };
    reader.readAsBinaryString(file);
  };

  const handleBulkSubmit = async () => {
    if (importPreview.length === 0) return;
    setIsImporting(true);
    try {
      await api.post('/players/bulk', importPreview);
      setIsImportModalOpen(false);
      setImportPreview([]);
      fetchPlayers();
      alert('Bulk import successful!');
    } catch (err) {
      alert(err.response?.data?.message || 'Error during bulk import');
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      { Name: 'Virat Kohli', Category: 'Marquee', 'Base Price': '2 Cr', Rating: 98 },
      { Name: 'Jasprit Bumrah', Category: 'Bowlers', 'Base Price': '2 Cr', Rating: 99 },
      { Name: 'Hardik Pandya', Category: 'All Rounders', 'Base Price': '1.5 Cr', Rating: 95 },
      { Name: 'Ruturaj Gaikwad', Category: 'Batsmen', 'Base Price': '50 Lakhs', Rating: 90 },
      { Name: 'Uncapped Talent', Category: 'Uncapped', 'Base Price': '20 Lakhs', Rating: 75 }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "IPL_Auction_Player_Template.xlsx");
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!formData.basePrice) return alert('Please enter a base price');
    const numericPrice = unit === 'Cr' ? formData.basePrice * 10000000 : formData.basePrice * 100000;
    if (isNaN(numericPrice)) return alert('Invalid price entered');
    
    try {
      await api.post('/players', { ...formData, basePrice: numericPrice });
      setIsModalOpen(false);
      setFormData({ name: '', category: 'Marquee', basePrice: '', rating: 50 });
      fetchPlayers();
    } catch (err) {
      console.error('Add Player Error:', err.response?.data || err);
      alert(err.response?.data?.error || err.response?.data?.message || 'Error adding player');
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm('Delete this player?')) return;
    try {
      await api.delete(`/players/${id}`);
      fetchPlayers();
    } catch (err) {
      alert('Error deleting player');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold font-display text-white">Players Management</h2>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="bg-secondary text-gray-400 border border-gray-700 hover:text-white hover:border-gray-500 px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
          >
            <FileSpreadsheet size={20} /> Bulk Import
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-neonBlue text-secondary font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-neonBlue/90 transition-all shadow-[0_0_10px_rgba(0,243,255,0.4)]"
          >
            <Plus size={20} /> Add Player
          </button>
        </div>
      </div>

      <div className="bg-secondary rounded-xl overflow-hidden border border-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left bg-secondary">
            <thead className="bg-gray-800/50 text-gray-400 border-b border-gray-700">
              <tr>
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Category</th>
                <th className="p-4 font-medium">Base Price</th>
                <th className="p-4 font-medium">Rating</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-200">
              {players.map(player => (
                <tr key={player._id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4">{player.name}</td>
                  <td className="p-4">
                    <span className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded-md text-sm border border-blue-500/20">
                      {player.category}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-neonBlue">{formatCurrency(player.basePrice)}</td>
                  <td className="p-4 flex items-center gap-1">
                    <span className="text-gold">★</span>{player.rating}/100
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-sm border ${
                      player.status === 'sold' 
                        ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                        : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                    }`}>
                      {player.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleDelete(player._id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {players.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500">No players found. Add some!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-secondary border border-gray-700 rounded-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">Add New Player</h3>
            <form onSubmit={handleAddPlayer} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-primary/50 border border-gray-700 rounded-lg p-2 text-white" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Category</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-primary/50 border border-gray-700 rounded-lg p-2 text-white">
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Base Price</label>
                <div className="flex gap-2">
                  <input required type="number" step="0.01" value={formData.basePrice} onChange={e => {
                    const val = e.target.value;
                    setFormData({...formData, basePrice: val === '' ? '' : parseFloat(val)});
                  }} className="flex-1 bg-primary/50 border border-gray-700 rounded-lg p-2 text-white" placeholder="0.00" />
                  <select value={unit} onChange={e => setUnit(e.target.value)} className="bg-primary/50 border border-gray-700 rounded-lg p-2 text-white outline-none">
                    <option value="Lakhs">Lakhs</option>
                    <option value="Cr">Cr</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Rating (1-100)</label>
                <input required type="range" min="1" max="100" value={formData.rating} onChange={e => setFormData({...formData, rating: parseInt(e.target.value)})} className="w-full accent-gold" />
                <div className="text-right text-sm text-gold mt-1">{formData.rating}/100</div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-gray-400 hover:bg-white/5 transition-colors">Cancel</button>
                <button type="submit" className="bg-accent px-4 py-2 rounded-lg text-white hover:bg-accent/80 transition-colors">Save Player</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-secondary border border-gray-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">Bulk Import Players</h3>
                <p className="text-sm text-gray-500">
                  Upload Excel (.xlsx) or CSV file with Name, Category, Price, and Rating columns. 
                  <button onClick={downloadTemplate} className="ml-2 text-neonBlue hover:underline font-bold">Download Template</button>
                </p>
              </div>
              <button onClick={() => { setIsImportModalOpen(false); setImportPreview([]); }} className="text-gray-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-auto flex-1">
              {importPreview.length === 0 ? (
                <div className="border-2 border-dashed border-gray-700 rounded-2xl p-12 text-center group hover:border-neonBlue transition-colors">
                  <Upload size={48} className="mx-auto text-gray-600 group-hover:text-neonBlue transition-colors mb-4" />
                  <label className="cursor-pointer block">
                    <span className="bg-neonBlue/10 text-neonBlue px-6 py-3 rounded-lg font-bold border border-neonBlue/20 hover:bg-neonBlue/20 transition-all inline-block mb-2">
                      Choose Excel or CSV File
                    </span>
                    <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileChange} />
                  </label>
                  <p className="text-sm text-gray-500">Max file size: 5MB</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-neonBlue/5 border border-neonBlue/20 p-4 rounded-xl flex justify-between items-center">
                    <div className="text-sm">
                      <span className="text-gray-400">Successfully parsed</span>
                      <b className="text-neonBlue ml-2 text-lg">{importPreview.length}</b> players
                    </div>
                    <button onClick={() => setImportPreview([])} className="text-xs text-gray-500 hover:text-red-400 underline uppercase tracking-widest">Clear and restart</button>
                  </div>
                  
                  <div className="border border-gray-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-primary/50 text-gray-400 uppercase text-xs font-bold border-b border-gray-800">
                        <tr>
                          <th className="p-4">Name</th>
                          <th className="p-4">Category</th>
                          <th className="p-4">Parsed Price</th>
                          <th className="p-4">Rating</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {importPreview.slice(0, 10).map((p, i) => (
                          <tr key={i} className="text-gray-300">
                            <td className="p-4 font-bold">{p.name}</td>
                            <td className="p-4">{p.category}</td>
                            <td className="p-4 font-mono text-neonBlue">{formatCurrency(p.basePrice)}</td>
                            <td className="p-4">★ {p.rating}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importPreview.length > 10 && (
                      <div className="p-4 text-center text-xs text-gray-600 bg-black/20 border-t border-gray-800">
                        ... and {importPreview.length - 10} more players
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-800 flex justify-end gap-4 bg-primary/20">
              <button 
                onClick={() => { setIsImportModalOpen(false); setImportPreview([]); }} 
                className="px-6 py-2 text-gray-400 hover:bg-white/5 rounded-lg transition-colors"
                disabled={isImporting}
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkSubmit}
                disabled={importPreview.length === 0 || isImporting}
                className={`px-8 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
                  importPreview.length > 0 && !isImporting 
                  ? 'bg-neonBlue text-secondary hover:bg-neonBlue/90 shadow-[0_0_15px_rgba(0,243,255,0.4)]' 
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isImporting ? 'Processing...' : 'Confirm and Import All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
