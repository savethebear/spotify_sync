class ConstantVariables {
    constructor() {
        // this.server_ip = "192.168.1.30:3000";
        // this.server_ip = "localhost:3000";
        this.server_ip = "spotify-sync-app.herokuapp.com";
        
        // saved access token keys
        this.access_token_key = 'spotify-sync-access-token';
        this.access_token_expiry_key = "spotify-sync-access-token-expires-in";
        this.refresh_token_key = "spotify-sync-refresh-token";
        this.room_id_key = "spotify-sync-room-id";
    }
}

export default ConstantVariables;