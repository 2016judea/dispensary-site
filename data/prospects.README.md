# data/prospects.json

248 licensed Minnesota cannabis retailers, parsed from public JSON-LD: slug,
name, street, city, zip, lat/lon, phone, Google rating and review count, their
current website, plus — on the 16 Saint Paul rows — a `scan` object measured
against their live homepage (load ms, bytes, https, mobile viewport, title,
meta description, JSON-LD block count, iframe count, script count, detected
platform) and a one-line `opener_fact`.

**Contact email addresses have been removed from this copy.** They are real
people's private addresses, and nothing in this repository needs them: skins are
built from name, address, phone, rating and the scan. The copy that carries them
stays outside the repo.

`scripts/skin.mjs` reads this file. Nothing at runtime imports it.
