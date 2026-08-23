# NOVAWORKS interface + integration update

This update focuses on the August 21 interface review.

## Changed
- NOVA AI now uses `OPENAI_API_KEY` and the official OpenAI `/v1/responses` endpoint. Default model: `gpt-5.6-luna`.
- IT System Health performs a real OpenAI key connectivity check.
- NIDA integration gives explicit credential/session errors, trims env values, supports the same HTTP Basic authentication as the supplied Flask example, and times out cleanly.
- Reception has NIDA/manual identity modes. In NIDA mode identity fields are filled from NIDA and are not manually edited.
- Reception page has a professional two-column layout with live customer/stay preview and returning-customer history.
- Add Staff has a small profile photo editor and a sticky live staff preview instead of a full-width image area.
- Homepage Content sign-in image editor is constrained and includes a live desktop sign-in preview.
- Actual sign-in page is a centered compact card instead of a full-screen 50/50 layout.
- Dashboard typography is cleaner and uses sans-serif headings for operational screens.
- Image uploads are automatically resized and recompressed to WebP in the browser before R2 upload when this reduces file size.
- Cloudflare delivery defaults to `assets.novaworks.rw`, quality 72, responsive `srcset`, automatic format negotiation, lazy loading and fetch priority for hero images.
- R2 supports either `R2_PUBLIC_BASE_URL` or `R2_PUBLIC_URL` for compatibility.

## Required `.env`
```env
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-5.6-luna

NIDA_API_URL=https://devhie.moh.gov.rw:5000/api/v1/citizens/getCitizen
NIDA_USERNAME=your_username
NIDA_PASSWORD=your_password

R2_PUBLIC_BASE_URL=https://assets.novaworks.rw
VITE_CF_IMAGE_HOSTS=assets.novaworks.rw
```

After changing `.env`, restart `npm run dev`; Vite/server environment values are not reliably refreshed until restart.

## NIDA 401
A 401 from the upstream NIDA/HIE service means the HTTP Basic credentials or access authorization were rejected. The updated UI now distinguishes this from a NOVAWORKS session error. Verify the two NIDA env values and any required network/VPN access, then restart Vite.
