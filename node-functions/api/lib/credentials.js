import path from "path";
import fs from "fs";

// 读取访问密钥：
// 1) 优先从环境变量 SECRET_ID / SECRET_KEY 获取
// 2) 若缺失则尝试读取项目根目录下的 key.txt
export function getKeys() {
  // 1. Try Environment Variables first
  let secretId = process.env.SECRET_ID;
  let secretKey = process.env.SECRET_KEY;

  if (secretId && secretKey) {
    return { secretId, secretKey };
  }

  // 2. Try key.txt if Env Vars are missing
  try {
    // const keyPath = path.resolve(__dirname, '../../key.txt');
    const keyPath = path.resolve(process.cwd(), "key.txt");

    if (fs.existsSync(keyPath)) {
      const content = fs.readFileSync(keyPath, "utf-8");
      const lines = content.split("\n");

      lines.forEach((line) => {
        if (line.includes("SecretId") && !secretId) {
          secretId = line.split("：")[1].trim();
        }
        if (line.includes("SecretKey") && !secretKey) {
          secretKey = line.split("：")[1].trim();
        }
      });
    }
  } catch (err) {
    console.error("Error reading key.txt:", err);
  }

  return { secretId, secretKey };
}

