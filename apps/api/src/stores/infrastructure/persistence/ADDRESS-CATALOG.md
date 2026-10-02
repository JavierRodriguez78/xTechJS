# Address Catalog

- Countries/territories and Spanish names: `i18n-iso-countries` (MIT), generated
  from the version pinned in the workspace lockfile. Includes 250 entries.
- Spanish postal locality records: [GeoNames](https://www.geonames.org/),
  [ES.zip](https://download.geonames.org/export/zip/ES.zip).
- Postal data license: Creative Commons Attribution, as published in
  [the source readme](https://download.geonames.org/export/zip/readme.txt),
  which states CC BY 4.0 and also links to CC BY 3.0.
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Changes: discarded coordinates and community subdivisions; retained province,
  place and postal code; deduplicated exact province/place/postal combinations.
- Retrieval timestamp and source URL are stored in the generated snapshot.
- Coverage: 52 Spanish provinces/autonomous cities, 37,867 postal locality
  combinations. A locality can have several postal codes; several localities
  can share one postal code. Place names are those supplied by GeoNames, not
  necessarily municipal administrative names.
- Data is provided without guarantees of completeness or postal accuracy. This
  is not an official Correos address validator. International postal coverage
  is not included.

The migration imports the committed TypeScript snapshot offline in batches.
It does not perform network requests at startup or change existing store
address strings. Existing incomplete addresses must be completed explicitly.

To regenerate a future snapshot:

```sh
node apps/api/scripts/import-address-catalog.mjs
```

Review changes and add a new incremental migration for an existing installation;
do not expect rerunning the generator to update a previously applied migration.