import FtpDeploy from "ftp-deploy";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ftpDeploy = new FtpDeploy();

const FTP_USER = process.env.FTP_USER;
const FTP_PASSWORD = process.env.FTP_PASSWORD;
const FTP_HOST = process.env.FTP_HOST;
const FTP_PORT = Number(process.env.FTP_PORT || "21");

if (!FTP_USER || !FTP_PASSWORD || !FTP_HOST) {
    throw new Error("Missing FTP_USER, FTP_PASSWORD or FTP_HOST environment variables.");
}

const configWebhooks = {
    user: FTP_USER,
    password: FTP_PASSWORD,
    host: FTP_HOST,
    port: FTP_PORT,
    localRoot: path.join(__dirname, 'hostinger'),
    remoteRoot: "/public_html/api/",
    include: ["*.php"],
    deleteRemote: false,
    forcePasv: true
};

const configReact = {
    user: FTP_USER,
    password: FTP_PASSWORD,
    host: FTP_HOST,
    port: FTP_PORT,
    localRoot: path.join(__dirname, 'dist/public'),
    remoteRoot: "/public_html/",
    include: ["*", "**/*"],
    exclude: ["api/**"],
    deleteRemote: false, // Mantendo true apaga o htaccess base
    forcePasv: true
};

async function uploadCore() {
    try {
        console.log("-> Uploading Webhooks API...");
        await ftpDeploy.deploy(configWebhooks);

        console.log("-> Uploading React UI Build...");
        await ftpDeploy.deploy(configReact);

        console.log("✅ Sistema inteiro on-line com o dashboard blindado e FTP completo!");
    } catch (err) {
        console.error("\n❌ Falha no Upload: ", err);
    }
}
uploadCore();
