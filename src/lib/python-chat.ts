import path from "path";
import { execFile } from "child_process";

type ChatHistoryItem = {
  role: "user" | "model";
  parts: { text: string }[];
};

export async function getPythonChatReply(input: {
  message: string;
  history: ChatHistoryItem[];
}) {
  const scriptPath = path.join(process.cwd(), "src", "backend", "chat_model.py");

  return new Promise<{ reply: string }>((resolve, reject) => {
    const child = execFile(
      "python",
      [scriptPath],
      {
        cwd: process.cwd(),
        env: process.env,
        maxBuffer: 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || stdout || error.message));
          return;
        }

        try {
          resolve(JSON.parse(stdout));
        } catch (parseError) {
          reject(
            new Error(
              `Failed to parse Python chat response: ${
                parseError instanceof Error ? parseError.message : String(parseError)
              }`,
            ),
          );
        }
      },
    );

    child.stdin?.write(JSON.stringify(input));
    child.stdin?.end();
  });
}
