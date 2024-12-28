"use client"

import './globals.css';
import Leaderboard from '../components/Leaderboard';
import styles from '../styles/Game.module.css';
import dynamic from 'next/dynamic';
const Game  = dynamic(() => import('../components/Game'), { ssr: false });
//import Game from '../components/Game';

const Home = () => {
  return (
    <div className={styles.container}>
      <div className={styles.gameContainer}>
        <Game />
      </div>
      <div className={styles.leaderboardContainer}>
        <Leaderboard />
      </div>
    </div>
  );
};

export default Home;
