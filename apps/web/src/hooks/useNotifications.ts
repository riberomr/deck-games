import { useEffect, useState } from 'react';
import OneSignal from 'react-onesignal';

// Singleton flag to prevent multiple OneSignal initializations
let oneSignalInitialized = false;

export const useNotifications = () => {
    const [permission, setPermission] = useState<boolean>(false);

    useEffect(() => {
        const initOneSignal = async () => {
            try {
                if (!oneSignalInitialized) {
                    await OneSignal.init({
                        appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
                        allowLocalhostAsSecureOrigin: true,
                    });
                    oneSignalInitialized = true;
                }
                // Sync state with current permission status
                setPermission(OneSignal.Notifications.permission);
            } catch (error) {
                console.error('OneSignal Init Error:', error);
            }
        };

        initOneSignal();
    }, []);

    const requestPermission = async () => {
        try {
            console.log("Requesting permission...");
            const accepted = await OneSignal.Notifications.requestPermission();
            console.log("Permission result:", accepted);
            setPermission(accepted);
        } catch (error) {
            console.error('Error requesting permission:', error);
        }
    };

    const subscribeToLobby = async (matchId: string) => {
        try {
            await OneSignal.User.addTag("hosted_match_id", matchId);
            console.log(`Subscribed to match: ${matchId}`);
        } catch (error) {
            console.error('Error subscribing to lobby:', error);
        }
    };

    return { permission, requestPermission, subscribeToLobby };
};