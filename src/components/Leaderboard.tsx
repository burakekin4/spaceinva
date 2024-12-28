"use client"
import { useEffect, useState } from "react";
import { getHighScores } from "../utils/firestore";
import styles from "../styles/Leaderboard.module.css";

interface HighScore {
  id: string;
  name: string;
  score: number;
}

const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<HighScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHighScores() {
      try {
        setLoading(true);
        const scores = await getHighScores();
        const sortedScores = scores.sort((a, b) => b.score - a.score); // Sort scores in descending order
        setLeaderboard(sortedScores);
      } catch (err) {
        setError("Failed to load leaderboard. Please try again.");
        console.error("Error fetching leaderboard:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHighScores();
  }, []);

  if (loading) {
    return (
      <div className={styles.leaderboard}>
        <h2>Leaderboard</h2>
        {/* Display 5 skeleton items */}
        {[...Array(5)].map((_, index) => (
          <div key={index} className={styles.skeleton}>
            Loading...
          </div>
        ))}
      </div>
    );
  }

  if (error) return <p>{error}</p>;

  return (
    <div className={styles.leaderboard}>
      <h2>Leaderboard</h2>
      {leaderboard.length > 0 ? (
        <ol>
          {leaderboard.map((entry, index) => (
            <li key={entry.id}>
              {index + 1}. {entry.name} - {entry.score}
            </li>
          ))}
        </ol>
      ) : (
        <p>No scores available yet.</p>
      )}
    </div>
  );
};

export default Leaderboard;
