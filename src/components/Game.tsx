"use client"

import { useEffect, useState, useRef , useMemo} from 'react';
import Phaser from 'phaser';
import styles from '../styles/Game.module.css';
import Leaderboard from '../components/Leaderboard';
import { addHighScore } from "../utils/firestore";

interface ScoreEntry {
  id: string; // Add this line
  name: string;
  score: number;
}

const Game = () => {
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const gameInstanceRef = useRef<Phaser.Game | null>(null);
  const difficultyLevels = useMemo(() => [
    { threshold: 0, speed: 100, fireRate: 1000 },
    { threshold: 200, speed: 200, fireRate: 800 },
    { threshold: 500, speed: 400, fireRate: 600 },
    { threshold: 1000, speed: 800, fireRate: 200 },
  ], []);
  const [isHighScore, setIsHighScore] = useState(false); // Whether the score is high enough
  const [showNameInput, setShowNameInput] = useState(false); // Whether to show the name input screen
  const [playerName, setPlayerName] = useState(''); // Player name
  const [leaderboard] = useState<ScoreEntry[]>([]); // Add this at the top of your Game component
  
    let player: Phaser.Physics.Arcade.Image;
    let bullets: Phaser.Physics.Arcade.Group;
    let enemies: Phaser.Physics.Arcade.Group;
    let enemyBullets: Phaser.Physics.Arcade.Group;
    let buffs: Phaser.Physics.Arcade.Group;
    let fireRate = 300;
    let nextFire = 0;
    let multiFireActive = false;
    let multiFireTimer: Phaser.Time.TimerEvent | null = null;
    const enemyFireRate = 1000;
    let nextEnemyFire = 0;
    let cursors: Phaser.Types.Input.Keyboard.CursorKeys;

  useEffect(() => {
    if (gameOver) {
      const isHighEnough = leaderboard.some((entry) => score > entry.score) || leaderboard.length < 100;
      setIsHighScore(isHighEnough); // Show "Save Score" button only if score qualifies
    }
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      scene: {
        preload: preload,
        create: create,
        update: update,
      },
    };

    const game = new Phaser.Game(config);
    gameInstanceRef.current = game;


    function preload(this: Phaser.Scene) {
      this.load.image('player', '/player.png');
      this.load.image('invader', '/invader.png');
      this.load.image('bullet', '/bullet.png');
      this.load.image('enemyBullet', '/enemyBullet.png');
      this.load.image('background', '/background.png');
      this.load.image('buffMultiFire', '/buff_multi_fire.png'); // Multiple fire buff
      this.load.image('buffLife', '/buff_life.png'); // Extra life buff
      this.load.image('buffFireRate', '/buff_fire_rate.png'); // Fire rate buff

    }

    
    

    function create(this: Phaser.Scene) {
      this.add.image(400, 300, 'background').setDisplaySize(800, 600);

      player = this.physics.add
        .image(400, 550, 'player')
        .setCollideWorldBounds(true)
        .setDisplaySize(50, 50);
        cursors = this.input!.keyboard!.createCursorKeys();
        

      bullets = this.physics.add.group({
        defaultKey: 'bullet',
        maxSize: 50,
        runChildUpdate: true,
      });

      enemyBullets = this.physics.add.group({
        defaultKey: 'enemyBullet',
        maxSize: 50,
        runChildUpdate: true,
      });

      buffs = this.physics.add.group();

      spawnEnemies.call(this);

      // Add collision detection
      addCollisionHandlers.call(this);
    }

    function getCurrentDifficulty(score: number) {
      let currentLevel = difficultyLevels[0]; // Default to the first level
      for (const level of difficultyLevels) {
        if (score >= level.threshold) {
          currentLevel = level;
        } else {
          break;
        }
      }
      return currentLevel;
    }
    
    function addCollisionHandlers(this: Phaser.Scene) {
      this.physics.add.collider(
        bullets,
        enemies,
        (bullet, enemy) => hitEnemy.call(this, bullet as Phaser.Physics.Arcade.Image, enemy as Phaser.Physics.Arcade.Image),
        undefined,
        this
      );
    
      this.physics.add.collider(
        enemyBullets,
        player,
        (playerObj, enemyBullet) =>
          hitPlayer.call(this, playerObj as Phaser.Physics.Arcade.Image, enemyBullet as Phaser.Physics.Arcade.Image),
        undefined,
        this
      );
    
      this.physics.add.overlap(
        player,
        buffs,
        (playerObj, buff) => collectBuff.call(this, playerObj as Phaser.Physics.Arcade.Image, buff as Phaser.Physics.Arcade.Image),
        undefined,
        this
      );
    
      // Add this collider for player bullets and enemy bullets
      this.physics.add.collider(
        bullets,
        enemyBullets,
        (playerBullet, enemyBullet) =>
          destroyBullets.call(this, playerBullet as Phaser.Physics.Arcade.Image, enemyBullet as Phaser.Physics.Arcade.Image),
        undefined,
        this
      );
    }

    function spawnEnemies(this: Phaser.Scene) {
    const { speed } = getCurrentDifficulty(score); // Get difficulty based on current score

    enemies = this.physics.add.group({
      key: 'invader',
      repeat: 11, // Total 12 enemies
      setXY: { x: 12, y: 0, stepX: 70 },
    });
    

  enemies.children.iterate((enemy) => {
    const enemySprite = enemy as Phaser.Physics.Arcade.Image;
    enemySprite
      .setBounce(1)
      .setDisplaySize(40, 40)
      .setVelocityX(Phaser.Math.Between(150, speed)) // Adjust speed based on difficulty
      .setVelocityY(speed/3)
      .setCollideWorldBounds(true);
    return true;
  });

  addCollisionHandlers.call(this);
}


    function update(this: Phaser.Scene, time: number) {
      if (cursors.left.isDown) {
        player.setVelocityX(-160);
      } else if (cursors.right.isDown) {
        player.setVelocityX(160);
      } else {
        player.setVelocityX(0);
      }

      if (cursors.space.isDown && time > nextFire) {
        shootBullet.call(this);
      }

      // Destroy buffs that fall out of bounds
      buffs.children.iterate((buff) => {
        const buffObj = buff as Phaser.Physics.Arcade.Image;
        if (!buffObj || !buffObj.active) return true; // Skip if buff is undefined or inactive
        if (buffObj.y > 600) {
          console.log('Buff destroyed: Out of bounds');
          buffObj.destroy();
        }
        return true; // Required by Phaser's iterate
      });

      const shooters: Phaser.Physics.Arcade.Image[] = [];
      enemies.children.iterate((enemy) => {
        const enemySprite = enemy as Phaser.Physics.Arcade.Image;
        if (enemySprite.body && (enemySprite.body.blocked.right || enemySprite.body.blocked.left)) {
          enemySprite.setVelocityX(-enemySprite.body.velocity.x);
          enemySprite.y += 10;
        }

        if (shooters.length < 3) {
          shooters.push(enemySprite);
        }
        return true;
      });

      if (time > nextEnemyFire) {
        nextEnemyFire = time + enemyFireRate;
        shooters.forEach((enemy) => {
          enemyShoot.call(this, enemy);
        });
      }

      bullets.children.iterate((bullet) => {
        const bulletObj = bullet as Phaser.Physics.Arcade.Image;
        if (!bulletObj || !bulletObj.active) return true; // Skip if bullet is undefined or inactive
        if (bulletObj.y < 0) {
          bulletObj.setActive(false);
          bulletObj.setVisible(false);
        }
        return true;
      });

      enemyBullets.children.iterate((bullet) => {
        const bulletObj = bullet as Phaser.Physics.Arcade.Image;
        if (!bulletObj || !bulletObj.active) return true; // Skip if bullet is undefined or inactive
        if (bulletObj.y > 600) {
          bulletObj.setActive(false);
          bulletObj.setVisible(false);
        }
        return true;
      });

      if (enemies.countActive(true) === 0) {
        setWave((prevWave) => prevWave + 1);
        spawnEnemies.call(this);
      }
    }

    function shootBullet(this: Phaser.Scene) {
      if (multiFireActive) {
        // Fire multiple bullets at different angles
        const angles = [-10, 0, 10]; // Spread of bullets
        angles.forEach((angle) => {
          const bullet = bullets.get() as Phaser.Physics.Arcade.Image;
          if (bullet) {
            bullet
              .setActive(true)
              .setVisible(true)
              .setPosition(player.x, player.y - 20)
              .setDisplaySize(10, 20)
              .setVelocityY(-300)
              .setVelocityX(angle * 10); // Adjust X velocity for bullet spread
          }
        });
      } else {
        // Fire a single bullet
        const bullet = bullets.get() as Phaser.Physics.Arcade.Image;
        if (bullet) {
          bullet
            .setActive(true)
            .setVisible(true)
            .setPosition(player.x, player.y - 20)
            .setDisplaySize(10, 20)
            .setVelocityY(-300);
        }
      }
      nextFire = this.time.now + fireRate;
    }
    
    function enemyShoot(this: Phaser.Scene, enemy: Phaser.Physics.Arcade.Image) {
      const { fireRate } = getCurrentDifficulty(score); // Get difficulty for fire rate
      const enemyBullet = enemyBullets.get() as Phaser.Physics.Arcade.Image;
    
      if (enemyBullet) {
        enemyBullet
          .setActive(true)
          .setVisible(true)
          .setPosition(enemy.x, enemy.y + 20)
          .setDisplaySize(10, 20)
          .setVelocityY(300);
      }
    
      // Adjust nextEnemyFire based on current difficulty
      nextEnemyFire = this.time.now + fireRate;
    }
    

    function collectBuff(this: Phaser.Scene, player: Phaser.Physics.Arcade.Image, buff: Phaser.Physics.Arcade.Image) {
      console.log("Buff collected: ", buff.texture.key);
      if (buff.texture.key === 'buffMultiFire') {
        activateMultiFireBuff.call(this); // Use 'this' which is the scene
      } else if (buff.texture.key === 'buffLife') {
        setLives((prevLives) => Math.min(prevLives + 1, 3));
        console.log("Extra life applied!");
      } else if (buff.texture.key === 'buffFireRate') {
        activateFireRateBuff.call(this); // Activate the fire rate buff
        console.log("Fire rate buff applied!");
      }
      buff.destroy();
    }
    
    
    function activateFireRateBuff(this: Phaser.Scene) {
      console.log("Activating fire rate buff!");
    
      fireRate /= 2; // Double the fire rate (reduce fire rate interval)
    
      this.time.addEvent({
        delay: 5000, // Buff lasts for 5 seconds
        callback: () => {
          fireRate *= 2; // Restore original fire rate
          console.log("Fire rate buff expired.");
        },
        callbackScope: this,
      });
    }
    

    function activateMultiFireBuff(this: Phaser.Scene) {
      console.log("Activating multiple fire buff!");
      if (this.time) { // Check if time exists in the scene context
        if (multiFireTimer) this.time.removeEvent(multiFireTimer);
    
        multiFireActive = true;
    
        multiFireTimer = this.time.addEvent({
          delay: 5000, // Buff lasts for 5 seconds
          callback: () => {
            multiFireActive = false; // Disable multiple fire
            console.log("Multiple fire buff expired.");
          },
        });
      } else {
        console.error('Time not available in scene context');
      }
    }
    
    function destroyBullets(playerBullet: Phaser.Physics.Arcade.Image, enemyBullet: Phaser.Physics.Arcade.Image) {
      playerBullet.setActive(false).setVisible(false).destroy();
      enemyBullet.setActive(false).setVisible(false).destroy();
    }
    

    
    

    
    
    
    function hitPlayer(player: Phaser.Physics.Arcade.Image, enemyBullet: Phaser.Physics.Arcade.Image) {
      enemyBullet.setActive(false).setVisible(false).destroy();
      setLives((prevLives) => {
        if (prevLives <= 1) {
          setGameOver(true);
          return 0;
        }
        return prevLives - 1;
      });
    }
    
    return () => {
      game.destroy(true);
    };
  }, [gameStarted, gameOver, leaderboard, difficultyLevels]);

  function dropBuff(x: number, y: number, buffType: string) {
    console.log(`Dropping buff: ${buffType}`);
    const buff = buffs.create(x, y, buffType).setDisplaySize(30, 30).setVelocityY(100);
    buff.setTexture(buffType); // Explicitly set the texture
    buff.setCollideWorldBounds(false); // Buffs should fall out of bounds if not collected
  }

  function hitEnemy(bullet: Phaser.Physics.Arcade.Image, enemy: Phaser.Physics.Arcade.Image) {
    bullet.setActive(false).setVisible(false).destroy();
    enemy.setActive(false).setVisible(false).destroy();
    setScore((prevScore) => prevScore + 10);
  
    const randomChance = Math.random(); // Generate a single random value for this drop
    if (randomChance < 0.05) { // 5% chance
      dropBuff(enemy.x, enemy.y, 'buffMultiFire');
    } else if (randomChance < 0.10) { // Next 5% chance (5% - 10%)
      dropBuff(enemy.x, enemy.y, 'buffFireRate');
    } else if (randomChance < 0.15) { // Next 5% chance (10% - 15%)
      dropBuff(enemy.x, enemy.y, 'buffLife');
    }
    
  }
  function saveScore() {
    if (!playerName.trim()) return; // Ensure the player name is not empty
    addHighScore(playerName, score)
      .then(() => {
        console.log("Highscore saved successfully!");
      })
      .catch((error) => {
        console.error("Error saving highscore:", error);
      });
  }


  const restartGame = () => {
    // Reset game state variables
    setScore(0);
    setLives(3);
    setWave(1);
    setGameOver(false);
    setGameStarted(false); // Hide the game screen before restarting
  
    // Destroy the current Phaser game instance
    if (gameInstanceRef.current) {
      gameInstanceRef.current.destroy(true);
      gameInstanceRef.current = null;
    }
  
    // Restart the game by recreating the Phaser instance after a short delay
    setTimeout(() => {
      setGameStarted(true); // Trigger the game start again
    }, 100); // Delay to ensure the game instance is recreated cleanly
  };
  

  return (
    <div className={styles.container}>
      {!gameStarted && !gameOver && (
        <div className={styles.startScreen}>
          <div className={styles.startOverlay}>
            <button className={styles.startButton} onClick={() => setGameStarted(true)}>
              Start Game
            </button>
          </div>
        </div>
      )}

      {gameStarted && !gameOver && (
        <div className={styles.gameContainer}>
          <h1 className={styles.title}>SPACE INVADER</h1>
          <div className={styles.lives}>Lives: {lives}</div>
          <div className={styles.wave}>Wave: {wave}</div>
          <div className={styles.score}>Score: {score}</div>
          <div id="gameBoard" className={styles.gameBoard}></div>
          <Leaderboard />
        </div>
      )}

{gameOver && !showNameInput && (
  <div className={styles.gameOverScreen}>
    <div className={styles.gameOverOverlay}>
      <h1 className={styles.gameOverTitle}>Game Over</h1>
      <div className={styles.finalScore}>Final Score: {score}</div>
      {isHighScore && (
        <button
          className={styles.saveButton}
          onClick={() => setShowNameInput(true)} // Show name input screen
        >
          Save Score
        </button>
      )}
      <button className={styles.startButton} onClick={restartGame}>
        Restart Game
      </button>
    </div>
  </div>
)}
{showNameInput && (
  <div className={styles.nameInputScreen}>
    <div className={styles.nameInputOverlay}>
      <h2 className={styles.nameInputOverlayh2}>Enter Your Name</h2>
      <input
        type="text"
        value={playerName}
        placeholder="Player"
        maxLength={20}
        onChange={(e) => setPlayerName(e.target.value)}
        className={styles.nameInput}
      />
      <button
        className={styles.saveButton}
        onClick={() => {
          saveScore();
          setShowNameInput(false);
          restartGame();
        }}
        disabled={!playerName.trim()}
      >
        Save
      </button>
    </div>
  </div>
)}




    </div>
  );
};

export default Game;
