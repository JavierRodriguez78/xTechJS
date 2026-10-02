import type { MigrationInterface, QueryRunner } from "typeorm";
import { addressCatalog } from "../address-catalog-data.js";

export class SeedAddressCatalogMigration implements MigrationInterface {
  name = "SeedAddressCatalogMigration1740700000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE stores ALTER COLUMN address_street TYPE varchar(500), ALTER COLUMN address TYPE text');
    await queryRunner.query('CREATE TABLE address_countries (code varchar(2) PRIMARY KEY, name text NOT NULL UNIQUE)');
    await queryRunner.query('CREATE TABLE address_provinces (code varchar(2) PRIMARY KEY, country_code varchar(2) NOT NULL REFERENCES address_countries(code), name text NOT NULL)');
    await queryRunner.query('CREATE TABLE address_postal_places (province_code varchar(2) NOT NULL REFERENCES address_provinces(code), city text NOT NULL, postal_code varchar(5) NOT NULL, PRIMARY KEY (province_code, city, postal_code))');
    await queryRunner.query(`INSERT INTO address_countries SELECT code, name FROM jsonb_to_recordset($1::jsonb) AS entry(code text, name text)`, [JSON.stringify(addressCatalog.countries)]);
    await queryRunner.query(`INSERT INTO address_provinces SELECT code, 'ES', name FROM jsonb_to_recordset($1::jsonb) AS entry(code text, name text)`, [JSON.stringify(addressCatalog.provinces)]);
    for (let offset = 0; offset < addressCatalog.places.length; offset += 1000) {
      await queryRunner.query(`INSERT INTO address_postal_places SELECT "provinceCode", city, "postalCode" FROM jsonb_to_recordset($1::jsonb) AS entry("provinceCode" text, city text, "postalCode" text)`, [JSON.stringify(addressCatalog.places.slice(offset, offset + 1000))]);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE address_postal_places');
    await queryRunner.query('DROP TABLE address_provinces');
    await queryRunner.query('DROP TABLE address_countries');
  }
}