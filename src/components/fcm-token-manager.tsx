
'use client';

import { useEffect } from 'react';
import { getMessagingToken, saveFCMToken } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export default function FCMTokenManager({ hallTicketNumber }: { hallTicketNumber: string }) {
  const { toast } = useToast();

  useEffect(() => {
    const handleTokenRefresh = async () => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          try {
            const currentToken = await getMessagingToken();
            if (currentToken) {
              await saveFCMToken(hallTicketNumber, currentToken);
            }
          } catch (error) {
            console.error('An error occurred while retrieving token. ', error);
            toast({
              variant: 'destructive',
              title: 'Notification Error',
              description: 'Could not get permission to show notifications.',
            });
          }
        } else if (Notification.permission === 'denied') {
            console.warn('Notification permission has been denied.');
        } else {
           // Request permission
           const permission = await Notification.requestPermission();
           if (permission === 'granted') {
                console.log('Notification permission granted.');
                handleTokenRefresh(); // Re-run to get and save token
           } else {
                console.warn('Notification permission not granted.');
           }
        }
      }
    };
    
    if(hallTicketNumber) {
        handleTokenRefresh();
    }

  }, [hallTicketNumber, toast]);

  return null; // This component does not render anything
}
