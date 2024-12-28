import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig"; // Ensure firebaseConfig is correct

// Function to add a highscore
export async function addHighScore(name: string, score: number) {
  try {
    await addDoc(collection(db, "highscores"), { name, score });
    console.log("High score added successfully!");
  } catch (error) {
    console.error("Error adding high score:", error);
  }
}

// Function to fetch highscores
export async function getHighScores() {
  try {
    const querySnapshot = await getDocs(collection(db, "highscores"));
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as { name: string; score: number }),
    }));
  } catch (error) {
    console.error("Error fetching high scores:", error);
    return [];
  }
}
  