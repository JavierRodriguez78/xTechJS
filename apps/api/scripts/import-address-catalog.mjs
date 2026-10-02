import { writeFile } from "node:fs/promises";
import { unzipSync, strFromU8 } from "fflate";
import { parse } from "csv-parse/sync";
import countries from "i18n-iso-countries";
import spanish from "i18n-iso-countries/langs/es.json" with { type: "json" };

countries.registerLocale(spanish);
{
  const response = await fetch("https://download.geonames.org/export/zip/ES.zip");
  if (!response.ok) throw new Error(`GeoNames download failed: ${response.status}`);
  const archive = unzipSync(new Uint8Array(await response.arrayBuffer()));
  const rows = parse(strFromU8(archive["ES.txt"]), { delimiter: "\t", skip_empty_lines: true });
  const provinces = new Map();
  const places = new Map();
  for (const row of rows) {
    const [country, postalCode, city, , , province, provinceCode] = row;
    if (country !== "ES" || !/^\d{5}$/.test(postalCode) || !province || !provinceCode || !city) throw new Error("Incomplete GeoNames record");
    provinces.set(provinceCode, { code: provinceCode, name: province });
    const place = { provinceCode, city, postalCode };
    places.set(JSON.stringify(place), place);
  }
  if (provinces.size !== 52 || places.size < 20000) throw new Error(`Unexpected coverage: ${provinces.size} provinces, ${places.size} places`);
  const catalog = {
    source: "https://download.geonames.org/export/zip/ES.zip",
    retrievedAt: new Date().toISOString(),
    countries: Object.entries(countries.getNames("es", { select: "official" })).map(([code, name]) => ({ code, name })),
    provinces: [...provinces.values()].sort((left, right) => left.code.localeCompare(right.code)),
    places: [...places.values()].sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))
  };
  const type = "{ source: string; retrievedAt: string; countries: { code: string; name: string }[]; provinces: { code: string; name: string }[]; places: { provinceCode: string; city: string; postalCode: string }[] }";
  await writeFile(new URL("../src/stores/infrastructure/persistence/address-catalog-data.ts", import.meta.url), `export const addressCatalog: ${type} = ${JSON.stringify(catalog, null, 2)};\n`);
  console.log(`${catalog.countries.length} countries, ${catalog.provinces.length} provinces, ${catalog.places.length} postal locality records`);
}