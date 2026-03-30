const game = new Game();

function startGame()    { game.start(null); }
function toggleCamera() { game.toggleCamera(); }
function restartGame()  { game.restartGame(); }
function newGame()      { game.newGame(); }
function exportMaze()   { game.exportMaze(); }
function importMaze(e)  { game.importMaze(e); }
function toggleMulti()  { game.setMultiplayer(document.getElementById('multiCheck').checked); }
