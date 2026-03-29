import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { LogOut, Users, Wallet, Trophy, ListOrdered } from 'lucide-react';
import api from '../../services/api';
import { formatCurrency } from '../../utils/format';
import SquadsOverview from '../Common/SquadsOverview';

export default function FranchiseDashboard() {
  const { user, logout } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('myteam');
  const [teams, setTeams] = useState([]);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Poll every 5 seconds for MVP live updates
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [teamsRes, stateRes] = await Promise.all([
        api.get('/teams'),
        api.get('/auction/state')
      ]);
      setTeams(teamsRes.data);
      setQueue(stateRes.data.queue || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  const myTeam = teams.find(t => t._id === user.teamId) || teams[0]; // fallback to first team if dev testing or unassigned

  const tabs = [
    { id: 'myteam', label: 'My Squad', icon: Users },
    { id: 'others', label: 'All Squads', icon: Wallet },
    { id: 'queue', label: 'Upcoming Target', icon: ListOrdered },
    { id: 'leaderboard', label: 'Leaderboard (Admin-only view)', icon: Trophy }, // User requested leaderboard admin only, but we can hide it or show basic rank. We will hide it or show basic stats.
  ];

  // We will respect User Request: Leaderboard only visible to admin.
  // Actually, I'll remove the leaderboard from the franchise dashboard completely.
  const filteredTabs = tabs.filter(t => t.id !== 'leaderboard');

  const renderMySquad = () => {
    if (!myTeam) return <div>No team assigned.</div>;
    const categories = ['Marquee', 'Batsmen', 'Wicket Keepers', 'All Rounders', 'Bowlers', 'Uncapped'];
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-secondary p-6 rounded-xl border border-gray-700 shadow-lg">
            <h4 className="text-gray-400 font-bold uppercase text-sm mb-2">Total Purse</h4>
            <div className="text-3xl font-mono text-white">{formatCurrency(myTeam.totalPurse)}</div>
          </div>
          <div className="bg-secondary p-6 rounded-xl border border-gray-700 shadow-lg">
            <h4 className="text-gray-400 font-bold uppercase text-sm mb-2">Funds Remaining</h4>
            <div className="text-3xl font-mono text-neonGreen">{formatCurrency(myTeam.remainingBudget)}</div>
          </div>
          <div className="bg-secondary p-6 rounded-xl border border-gray-700 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Users size={64} />
            </div>
            <h4 className="text-gray-400 font-bold uppercase text-sm mb-2">Squad Size</h4>
            <div className="text-3xl font-mono text-neonBlue">{myTeam.players.length}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {categories.map(cat => {
            const playersCat = myTeam.players.filter(p => p.category === cat);
            if (playersCat.length === 0) return null;
            return (
              <div key={cat} className="bg-secondary border border-gray-700 rounded-xl p-6">
                <h3 className="text-xl font-bold font-display text-white mb-4 pb-2 border-b border-gray-800 flex justify-between">
                  {cat}
                  <span className="text-neonBlue bg-neonBlue/10 px-2 rounded-full text-sm">{playersCat.length}</span>
                </h3>
                <div className="space-y-3">
                  {playersCat.map(p => (
                    <div key={p._id} className="bg-primary p-3 rounded-lg flex justify-between items-center group border border-transparent hover:border-gray-700 transition-colors">
                      <div>
                        <div className="font-bold text-gray-200">{p.name}</div>
                        <div className="text-sm text-gold">★ {p.rating}/100</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500 uppercase">Bought For</div>
                        <div className="font-mono text-neonBlue">{formatCurrency(p.soldPrice)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderOtherTeams = () => {
    const others = teams.filter(t => t._id !== myTeam?._id);
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {others.map(team => (
          <div key={team._id} className="bg-secondary border border-gray-700 rounded-xl p-6">
            <h3 className="text-xl text-white font-bold mb-4">{team.name}</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-primary/50 p-2 rounded-lg">
                <span className="text-sm text-gray-400">Budget</span>
                <span className="font-mono text-neonGreen">{formatCurrency(team.remainingBudget)}</span>
              </div>
              <div className="flex justify-between items-center bg-primary/50 p-2 rounded-lg">
                <span className="text-sm text-gray-400">Players</span>
                <span className="font-bold text-white bg-gray-600 px-2 rounded-md">{team.players.length}</span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-800">
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Top Acquisitions</h4>
              <div className="space-y-1">
                {team.players.slice(0, 3).map(p => (
                  <div key={p._id} className="text-sm flex gap-2 justify-between">
                    <span className="text-gray-300 truncate">{p.name}</span>
                    <span className="text-neonBlue font-mono">{formatCurrency(p.soldPrice)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderQueue = () => {
    return (
      <div className="bg-secondary border border-gray-700 rounded-xl p-6 max-w-4xl mx-auto">
        <h3 className="text-xl font-bold font-display text-white mb-6">Upcoming Players</h3>
        <div className="space-y-4">
          {queue.length > 0 ? queue.map((player, idx) => (
            <div key={player._id} className="bg-primary border border-gray-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center relative overflow-hidden group hover:border-neonBlue/50 transition-colors">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-neonBlue opacity-50"></div>
              <div className="mb-2 sm:mb-0">
                <div className="text-xs text-neonBlue font-mono font-bold tracking-wider mb-1">AUCTION #{idx + 1}</div>
                <div className="text-xl font-bold text-white">{player.name}</div>
                <div className="text-sm text-gray-400">{player.category} • Rating: {player.rating}/100</div>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Base Price</div>
                <div className="text-2xl font-mono text-white">{formatCurrency(player.basePrice)}</div>
              </div>
            </div>
          )) : (
             <div className="text-center p-12 bg-primary/30 border border-gray-800 rounded-xl text-gray-500">
                No players currently in the auction queue. Check back later!
             </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <header className="bg-secondary border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center">
          <h1 className="text-2xl font-bold font-display text-white mb-4 md:mb-0">
            <span className="neon-text-gold">Franchise</span> <span className="text-gray-400 font-light">| {myTeam?.name || 'Dashboard'}</span>
          </h1>
          
          <div className="flex bg-primary p-1 rounded-xl">
            {filteredTabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                    activeTab === tab.id 
                      ? 'bg-neonBlue/20 text-neonBlue shadow-lg border border-neonBlue/30' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              )
            })}
          </div>

          <button 
            onClick={logout}
            className="flex items-center gap-2 text-red-400 hover:bg-red-500/10 px-4 py-2 rounded-lg transition-colors mt-4 md:mt-0"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'myteam' && renderMySquad()}
        {activeTab === 'others' && <SquadsOverview />}
        {activeTab === 'queue' && renderQueue()}
      </main>
    </div>
  );
}
