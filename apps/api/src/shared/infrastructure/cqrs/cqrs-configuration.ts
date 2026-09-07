import { Cqrs } from "@xtaskjs/cqrs";

@Cqrs({ readDataSourceName: "default", writeDataSourceName: "default" })
export class CqrsConfiguration {}