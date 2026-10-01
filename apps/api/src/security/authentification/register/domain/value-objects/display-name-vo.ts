import { StringValueObject} from "@xtaskjs/value-objects";

export class DisplayNameVO extends StringValueObject {
    constructor(value: string) {
        const normalized = value.trim();
        if(normalized.length === 0) {
            throw new Error("Display name cannot be empty");
        }
        if(normalized.length > 160) {
            throw new Error("Display name cannot exceed 160 characters");
        }
        super(normalized);
    }
}
