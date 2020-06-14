import { Client } from 'https://deno.land/x/postgres/mod.ts';

export const client = new Client(Deno.env.get('POSTGRES_URI'));

export const init = async () => await client.connect();

export const query = async (q : QueryPart) => {
    const fullQuery = q.toSQL();
    return client.query(fullQuery.sql, ...fullQuery.bindings).then(v => v.rowsOfObjects());
}

export const sql = (parts : TemplateStringsArray, ...bindings : unknown[]) => {
    return new QueryPart(parts as unknown as string[], bindings);
}

export class QueryPart {
    parts : string[]
    bindings : unknown[]
    constructor (parts : string[], bindings : unknown[]) {
        this.parts = parts;
        this.bindings = bindings;
    }

    toSQL (count = {value: 0}) : Query {
        let sql = '';
        let bindings = [];

        for (let i = 0; i < this.parts.length; i++) {
            sql += this.parts[i];
            if (this.bindings[i] instanceof QueryPart) {
                const part = this.bindings[i] as QueryPart;
                const q = part.toSQL(count);
                sql += q.sql;
                bindings.push(...q.bindings);
            } else if (this.bindings[i]) {
                count.value += 1
                sql += `$${count.value}`;
                bindings.push(this.bindings[i]);
            }
        }

        return new Query(sql, bindings);
    }
}

class Query {
    sql : string
    bindings : unknown[]
    constructor (sql : string, bindings : unknown[]){
        this.sql = sql;
        this.bindings = bindings;
    }
}

// console.log(sql`select ${1}
//             from ${'thing'}
//             where ${sql`col=${true}`}
//             `.toSQL());
