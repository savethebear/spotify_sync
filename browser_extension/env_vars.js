class ConstantVariables {
    constructor() {
        this.server_ip = "192.168.1.30:3000";
        
        // saved access token keys
        this.LOCALSTORAGE_ACCESS_TOKEN_KEY = 'spotify-sync-access-token';
        this.LOCALSTORAGE_ACCESS_TOKEN_EXPIRY_KEY = "spotify-sync-access-token-expires-in";
        this.LOCALSTORAGE_REFRESH_TOKEN_KEY = "spotify-sync-refresh-token";
    }
}