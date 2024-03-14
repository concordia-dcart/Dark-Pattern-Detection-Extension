// pages/api/save-hints.js
import { sql } from '@vercel/postgres';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function saveHints(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { tabTitle, websiteName, pageUrl, hints } = req.body;

  try {
    await sql.begin(async (sql) => {
      for (const hint of hints) {
        await sql`INSERT INTO hints (tab_title, website_name, page_url, hint) VALUES (${tabTitle}, ${websiteName}, ${pageUrl}, ${hint})`;
      }
    });

    return res.status(200).json({ message: 'Hints saved successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error saving hints', error: error.message });
  }
}
