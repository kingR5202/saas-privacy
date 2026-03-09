import FtpDeploy from "ftp-deploy";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ftpDeploy = new FtpDeploy();

const configWebhooks = {
    user: "u299847582.privacybrasil.blog",
    password: "Rtydfgxc5202@",
    host: "46.202.145.211",
    port: 21,
    localRoot: path.join(__dirname, 'hostinger'),
    remoteRoot: "/public_html/api/",
    include: ["webhooks.php"],
    deleteRemote: false,
    forcePasv: true
};

const configReact = {
    user: "u299847582.privacybrasil.blog",
    password: "Rtydfgxc5202@",
    host: "46.202.145.211",
    port: 21,
    localRoot: path.join(__dirname, 'client/dist'),
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
