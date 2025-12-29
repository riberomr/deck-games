import { useRegisterSW } from 'virtual:pwa-register/react'

export const ReloadPrompt = () => {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r: any) {
            console.log('SW Registered: ' + r)
        },
        onRegisterError(error: any) {
            console.log('SW registration error', error)
        },
    })

    const close = () => {
        setOfflineReady(false)
        setNeedRefresh(false)
    }

    return (
        <div className="ReloadPrompt-container">
            {(offlineReady || needRefresh) && (
                <div className="fixed bottom-0 right-0 m-4 p-4 bg-zinc-800 text-white rounded-lg shadow-lg z-50 flex flex-col gap-2 border border-zinc-700">
                    <div className="mb-2">
                        {offlineReady
                            ? <span>App ready to work offline</span>
                            : <span>New content available, click on reload button to update.</span>
                        }
                    </div>
                    <div className="flex gap-2">
                        {needRefresh && (
                            <button className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 transition" onClick={() => updateServiceWorker(true)}>
                                Reload
                            </button>
                        )}
                        <button className="px-3 py-1 bg-zinc-600 rounded hover:bg-zinc-700 transition" onClick={() => close()}>
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
