declare global {
    namespace NodeJS {
        interface ProcessEnv {
            PORT: number;
            API_KEYS: string;
            ODDS_API_KEY: string;
            IP_WHITELIST: string;
        }
    }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {};
