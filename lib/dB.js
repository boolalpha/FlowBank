const NEXT_PUBLIC_LOCAL_HOST = process.env.NEXT_PUBLIC_LOCAL_HOST;
const NEXT_PUBLIC_LOCAL_PORT = process.env.NEXT_PUBLIC_LOCAL_PORT;
const NEXT_PUBLIC_LOCAL_DB_NAME = process.env.NEXT_PUBLIC_LOCAL_DB_NAME;
const NEXT_PUBLIC_LOCAL_DB_USER = process.env.NEXT_PUBLIC_LOCAL_DB_USER;
const NEXT_PUBLIC_LOCAL_DB_PASSWORD = process.env.NEXT_PUBLIC_LOCAL_DB_PASSWORD;

import mysql from 'serverless-mysql';

const db = mysql({
    config: {
        host: NEXT_PUBLIC_LOCAL_HOST,
        port: NEXT_PUBLIC_LOCAL_PORT,
        database: NEXT_PUBLIC_LOCAL_DB_NAME,
        user: NEXT_PUBLIC_LOCAL_DB_USER,
        password:NEXT_PUBLIC_LOCAL_DB_PASSWORD
    }
});

export default async function excuteQuery({ query, values }) {
    try {
        const results = await db.query(query, values);
        await db.end();
        return results;
    } catch (error) {
        return { error };
    }
}
