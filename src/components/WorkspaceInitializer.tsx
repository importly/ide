import firebase from 'firebase/app';
import 'firebase/database';
import 'firebase/auth';
import 'firebase/analytics';
import React, { useEffect } from 'react';
import type firebaseType from 'firebase';
import { defaultPermissionAtom } from '../atoms/workspace';
import {
  fileIdAtom,
  firebaseRefAtom,
  firebaseUserAtom,
  joinExistingWorkspaceWithDefaultPermissionAtom,
  joinNewWorkspaceAsOwnerAtom,
  setFirebaseErrorAtom,
  userRefAtom,
} from '../atoms/firebaseAtoms';
import { signInAnonymously } from '../scripts/firebaseUtils';
import { useAtomValue, useUpdateAtom } from 'jotai/utils';
import { useAtom } from 'jotai';

const firebaseConfig = {
  apiKey: 'AIzaSyBlzBGNIqAQSOjHZ1V7JJxZ3Nw70ld2EP0',
  authDomain: 'cp-ide.firebaseapp.com',
  databaseURL: 'https://cp-ide-default-rtdb.firebaseio.com',
  projectId: 'cp-ide',
  storageBucket: 'cp-ide.appspot.com',
  messagingSenderId: '1068328460784',
  appId: '1:1068328460784:web:9385b3f43a0e2604a9fd35',
  measurementId: 'G-G22TZ5YCKV',
};

if (typeof window !== 'undefined') {
  // firepad needs access to firebase
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  window.firebase = firebase;
}

if (!firebase.apps?.length) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const shouldUseEmulator =
    typeof window !== 'undefined' && location.hostname === 'localhost';
  if (shouldUseEmulator) {
    firebase.initializeApp({
      ...firebaseConfig,
      authDomain: 'localhost:9099',
      databaseURL: 'http://localhost:9000/?ns=cp-ide-default-rtdb',
    });
    firebase.auth().useEmulator('http://localhost:9099');
    firebase.database().useEmulator('localhost', 9000);
  } else {
    firebase.initializeApp(firebaseConfig);
    if (typeof window !== 'undefined' && firebase.analytics) {
      firebase.analytics();
    }
  }
}

export const WorkspaceInitializer: React.FC = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useAtom(firebaseUserAtom);
  const firebaseRef = useAtomValue(firebaseRefAtom);
  const fileId = useAtomValue(fileIdAtom);
  const setFirebaseError = useUpdateAtom(setFirebaseErrorAtom);
  const setUserRef = useUpdateAtom(userRefAtom);
  const joinNewWorkspaceAsOwner = useUpdateAtom(joinNewWorkspaceAsOwnerAtom);
  const joinExistingWorkspaceWithDefaultPermission = useUpdateAtom(
    joinExistingWorkspaceWithDefaultPermissionAtom
  );
  const setDefaultPermission = useUpdateAtom(defaultPermissionAtom);

  useEffect(() => {
    signInAnonymously();

    const unsubscribe = firebase.auth().onAuthStateChanged(user => {
      setFirebaseUser(user);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (firebaseUser && firebaseRef && fileId) {
      const uid = firebaseUser.uid;

      const ref = firebaseRef;
      const firebaseUserRef = ref.child('users').child(uid);

      setUserRef(firebaseUserRef);

      let hasJoinedWorkspace = false;
      if (fileId.isNewFile) {
        joinNewWorkspaceAsOwner();
        hasJoinedWorkspace = true;
      }

      const handleDefaultPermissionChange = (
        snap: firebaseType.database.DataSnapshot
      ) => {
        setDefaultPermission(snap.val() || 'READ_WRITE');

        if (!hasJoinedWorkspace) {
          if (snap.exists()) {
            joinExistingWorkspaceWithDefaultPermission();
          } else {
            // new doc, make me the owner
            joinNewWorkspaceAsOwner();
          }
          hasJoinedWorkspace = true;
        }
      };

      ref
        .child('settings')
        .child('defaultPermission')
        .on('value', handleDefaultPermissionChange, e => setFirebaseError(e));
      const unsubscribe2 = () =>
        ref
          .child('settings')
          .child('defaultPermission')
          .off('value', handleDefaultPermissionChange);

      const connectedRef = firebase.database().ref('.info/connected');
      const handleConnectionChange = (
        snap: firebaseType.database.DataSnapshot
      ) => {
        if (snap.val() === true) {
          const con = firebaseUserRef.child('connections').push();
          con.onDisconnect().remove();
          con.set(true);
        }
      };
      connectedRef.on('value', handleConnectionChange, e =>
        setFirebaseError(e)
      );
      const unsubscribe3 = () =>
        connectedRef.off('value', handleConnectionChange);

      return () => {
        unsubscribe2();
        unsubscribe3();
      };
    }
  }, [firebaseUser, firebaseRef, fileId]);

  return <>{children}</>;
};