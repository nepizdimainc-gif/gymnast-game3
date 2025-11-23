import React from 'react';
import Game from './components/Game';

const App: React.FC = () => {
  return (
    <div className="bg-slate-900 h-screen w-screen overflow-hidden">
      <Game />
    </div>
  );
};

export default App;