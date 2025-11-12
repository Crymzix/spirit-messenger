import { Layout } from "./layout";


export function Loading() {

    return (
        <Layout title="Spirit Messenger">
            <>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-msn-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600 font-msn text-lg">Initializing...</p>
                    </div>
                </div>
            </>
        </Layout>
    )
}