import readline from "readline";

export function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => rl.question(query, (answer) => {
    rl.close();
    resolve(answer);
  }));
}

export function askYesNoQuestion(query: string, defaultAnswer: "y" | "n"): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const prompt = `${query} (Y/N, default: ${defaultAnswer.toUpperCase()}): `;
    
    rl.question(prompt, (answer) => {
      rl.close();

      // Trim and normalize input
      const normalized = answer.trim().toLowerCase();

      if (normalized === "y") {
        resolve(true);
      } else if (normalized === "n") {
        resolve(false);
      } else if (normalized === "") {
        // Use the default answer if the user presses Enter
        resolve(defaultAnswer === "y");
      } else {
        console.log("Invalid input. Please enter Y or N.");
        resolve(askYesNoQuestion(query, defaultAnswer)); // Re-prompt on invalid input
      }
    });
  });
}

