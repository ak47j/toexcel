const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { google } = require("googleapis");
const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(helmet());
app.use(express.json());
const limiter = rateLimit({ windowMs: 60 * 1000, max: 30 });

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SERVICE_ACCOUNT_JSON =  process.env.SERVICE_ACCOUNT_JSON;
const APP_PORT = process.env.APP_PORT;

async function appendOrder(data) {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(SERVICE_ACCOUNT_JSON),
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets"
    ]
  });

  const sheets = google.sheets({
    version: "v4",
    auth
  });

  let sheet = 'Orders';
  if(data.sheet){
    sheet = data.sheet;
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheet}!A:H`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        new Date().toISOString(),
        data.name || "",
        data.phone || "",
        data.email || "",
        data.product || "",
        data.quantity || "",
        data.address || "",
        data.note || ""
      ]]
    }
  });

}

app.post("/order", limiter, async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      product,
      quantity,
      address,
      note,
      sheet
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: "name and phone required"
      });
    }

    await appendOrder({
      name,
      phone,
      email,
      product,
      quantity,
      address,
      note,
      sheet
    });

    res.json({
      success: true
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }

});


app.get("/health", (req, res) => {
  res.json({
    status: "ok"
  });
}); 

if (require.main === module) {
  app.listen(APP_PORT, () => console.log("running on " + APP_PORT));
}

module.exports = app;
