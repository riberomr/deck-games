import { useEffect, useState } from 'react';
import OneSignal from 'react-onesignal';

export const useNotifications = () => {
    const [permission, setPermission] = useState<boolean>(false);

    useEffect(() => {
        // Inicialización (solo una vez)
        const runOneSignal = async () => {
            try {
                await OneSignal.init({
                    appId: import.meta.env.VITE_ONESIGNAL_APP_ID, // Pon esto en tu .env
                    // Desactivar el popup nativo automático para tener control manual
                    allowLocalhostAsSecureOrigin: true, // Para probar en dev
                });

                // Verificamos si ya tiene permiso
                const isEnabled = OneSignal.Notifications.permission;
                setPermission(isEnabled);
            } catch (error) {
                console.error('Error inicializando OneSignal', error);
            }
        };

        runOneSignal();
    }, []);

    // Función para pedir permiso (Conectar al botón de la UI)
    const requestPermission = async () => {
        try {
            // En iOS esto DEBE ser disparado por un click del usuario
            await OneSignal.Notifications.requestPermission();
            setPermission(OneSignal.Notifications.permission);
        } catch (error) {
            console.error('Error pidiendo permiso', error);
        }
    };

    // Función para suscribirse a un Lobby
    const subscribeToLobby = async (matchId: string) => {
        try {
            // Login con el ID del usuario de Supabase (Opcional, pero recomendado)
            // await OneSignal.login(user_id); 

            // La clave: "Taggear" al usuario como dueño de esta sala
            await OneSignal.User.addTag("hosted_match_id", matchId);
            console.log(`Suscrito a notificaciones de la sala: ${matchId}`);
        } catch (error) {
            console.error('Error suscribiendo al lobby', error);
        }
    };

    return { permission, requestPermission, subscribeToLobby };
};