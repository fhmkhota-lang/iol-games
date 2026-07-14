import { StrictMode } from 'react';
import { Dashboard } from './components/Dashboard';
import MandelaExperience from './mandela/MandelaExperience';

function App() {
  // Evaluated on every render so direct URL navigation always picks it up.
  // The Mandela experience is kept outside StrictMode because the imperative
  // Three.js render loop breaks under double-effect invocation (renderer.dispose()
  // loses the WebGL context on the first pass, leaving the second mount with nothing).
  const isMandela = new URLSearchParams(window.location.search).has('mandela');

  if (isMandela) {
    return <MandelaExperience />;
  }

  return (
    <StrictMode>
      <Dashboard />
    </StrictMode>
  );
}

export default App;
