const express = require('express');
const app = express();
const axios = require('axios');
const { setInterval } = require('timers');
const fs = require('fs');

let links = loadLinks();

app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mami Uptime</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          background-color: #36393f; /* Discord gri rengi */
          color: #ffffff; /* Beyaz renk */
          margin: 0;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
        }
        h1 {
          font-size: 36px;
          text-align: center;
          margin-bottom: 30px;
        }
        form {
          text-align: center;
          margin-bottom: 20px;
        }
        label {
          display: block;
          margin-bottom: 5px;
        }
        input {
          width: 300px;
          padding: 10px;
          margin-bottom: 20px;
        }
        button {
          padding: 10px 20px;
          background-color: #7289da; /* Discord mavisi */
          color: #ffffff; /* Beyaz renk */
          border: none;
          cursor: pointer;
        }
        h2 {
          font-size: 24px;
          text-align: center;
          margin-bottom: 20px;
        }
        ul {
          list-style-type: none;
          padding: 0;
        }
        li {
          margin-bottom: 20px;
          text-align: center;
        }
        a {
          color: #7289da; /* Discord mavisi */
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div>
        <h1>Mami Uptime</h1>
        <form action="/link-ekle" method="post">
          <label for="link">Link:</label>
          <input type="text" id="link" name="link" required>
          <br>
          <button type="submit">Link Ekle</button>
        </form>
        <h2>Link Durumları</h2>
        <ul>
          ${links.map(({ url, status, uptimeCount }) => `<li>${url}: ${status} (${uptimeCount} kez uptime) - <a href="/link-sil?link=${url}">Sil</a></li>`).join('')}
        </ul>
        <a href="/linklerim">Linklerim</a>
      </div>
    </body>
    </html>
  `);
});

app.get('/linklerim', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mami Uptime - Linklerim</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          background-color: #36393f; /* Discord gri rengi */
          color: #ffffff; /* Beyaz renk */
          margin: 0;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
        }
        h1, ul, a {
          margin: 0;
          padding: 0;
        }
        h1 {
          font-size: 36px;
          text-align: center;
          margin-bottom: 30px;
        }
        ul {
          list-style-type: none;
          padding: 0;
        }
        li {
          margin-bottom: 20px;
          text-align: center;
        }
        a {
          color: #7289da; /* Discord mavisi */
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div>
        <h1>Mami Uptime - Linklerim</h1>
        <ul>
          ${links.map(({ url, status, uptimeCount }) => `<li>${url}: ${status} (${uptimeCount} kez uptime) - <a href="/link-sil?link=${url}">Sil</a></li>`).join('')}
        </ul>
        <a href="/">Ana Sayfa</a>
      </div>
    </body>
    </html>
  `);
});

app.get('/link-sil', (req, res) => {
  const linkToDelete = req.query.link;

  if (linkToDelete) {
    links = links.filter(linkObj => linkObj.url !== linkToDelete);
    res.send(`Link silindi: ${linkToDelete}`);
    saveLinks();
  } else {
    res.send('Silinmesi istenen bir link belirtmelisiniz.');
  }
});

app.post('/link-ekle', async (req, res) => {
  const link = req.body.link;

  if (link) {
    // Link set içinde yoksa ekle
    if (!links.some(existingLink => existingLink.url === link)) {
      links.push({ url: link, status: 'Uptime bekleniyor', uptimeCount: 0 });
      res.send(`Link eklendi: ${link}`);
      saveLinks();

      // Uptime işlemi için bekleme süresi ekleyelim (10 saniye)
      setTimeout(async () => {
        const linkObj = links.find(existingLink => existingLink.url === link);
        if (linkObj) {
          try {
            const response = await axios.get(linkObj.url);
            const newStatus = `Uptime: ${response.status}`;
            linkObj.status = newStatus;
            linkObj.uptimeCount = linkObj.uptimeCount ? linkObj.uptimeCount + 1 : 1;

            // Log dosyasına yaz
            logToFile(`${linkObj.url}: ${newStatus} (${linkObj.uptimeCount} kez uptime)`);
            saveLinks();
          } catch (error) {
            const newStatus = 'Uptime hatası';
            linkObj.status = newStatus;

            // Log dosyasına yaz
            logToFile(`${linkObj.url}: ${newStatus} (${linkObj.uptimeCount} kez uptime)`);
            saveLinks();
          }
        }
      }, 10000); // 10 saniye (10000 milisaniye)
    } else {
      res.send('Bu link zaten ekli.');
    }
  } else {
    res.send('Geçerli bir link belirtmelisiniz.');
  }
});

setInterval(async () => {
  for (const linkObj of links) {
    try {
      const response = await axios.get(linkObj.url);
      const newStatus = `Uptime: ${response.status}`;
      linkObj.status = newStatus;
      linkObj.uptimeCount = linkObj.uptimeCount ? linkObj.uptimeCount + 1 : 1;

      // Log dosyasına yaz
      logToFile(`${linkObj.url}: ${newStatus} (${linkObj.uptimeCount} kez uptime)`);
    } catch (error) {
      const newStatus = 'Uptime hatası';
      linkObj.status = newStatus;

      // Log dosyasına yaz
      logToFile(`${linkObj.url}: ${newStatus} (${linkObj.uptimeCount} kez uptime)`);
    }
  }
  saveLinks();
}, 60000); // 1 dakika (60000 milisaniye)

const logToFile = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;

  fs.appendFile('log.txt', logMessage, (err) => {
    if (err) {
      console.error('Log yazma hatası:', err);
    }
  });
};

function loadLinks() {
  try {
    const linksData = fs.readFileSync('links.txt', 'utf-8');
    return JSON.parse(linksData);
  } catch (error) {
    console.error('Linkler yüklenirken bir hata oluştu:', error);
    return [];
  }
}

function saveLinks() {
  fs.writeFile('links.txt', JSON.stringify(links), (err) => {
    if (err) {
      console.error('Linkler kaydedilirken bir hata oluştu:', err);
    }
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda başlatıldı.`);
});
