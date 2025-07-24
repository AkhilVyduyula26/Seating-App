
import * as admin from 'firebase-admin';

let app: admin.app.App;

export function getFirebaseAdminApp() {
    if (app) {
        return app;
    }

    if (admin.apps.length > 0) {
        app = admin.apps[0]!;
    } else {
        const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

        if (!serviceAccountPath) {
            throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable is not set. Cannot initialize Firebase Admin SDK.');
        }

        try {
            app = admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                projectId: "seatassignai-bccvh",
            });
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                console.error('Firebase service account key file not found at path specified by GOOGLE_APPLICATION_CREDENTIALS.');
                throw new Error('Firebase Admin SDK setup failed: Service account key file not found.');
            }
            throw error;
        }
    }
    
    return app;
}
