export interface IConfig {
    port: number;
    api_keys: string[];
    ip_whitelist: string[];
}

export default () => {
    const api_keys = process.env.API_KEYS?.split(",") || [""];
    const ip_whitelist = process.env.IP_WHITELIST?.split(",") || ["127.0.0.1"];
    const config: IConfig = {
        port: process.env.PORT || 3000,
        api_keys,
        ip_whitelist,
    };
    return config;
};
