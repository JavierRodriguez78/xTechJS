import { StringValueObject} from "@xtaskjs/value-objects";
export class AdminEmailVO extends StringValueObject {
    constructor(value: string) {
        const normalized= value.trim().toLowerCase();
        if(!normalized.includes("@")) {
            throw new Error("Invalid email address");
        }   
        super(normalized);
    }
}
