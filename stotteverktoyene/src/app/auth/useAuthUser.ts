import * as React from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { auth, db } from "../../firebase/firebase";

export function useAuthUser() {
  const [user, setUser] = React.useState<User | null>(() => auth.currentUser);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [isAdmin, setIsAdmin] = React.useState<boolean>(false);
  const [firstName, setFirstName] = React.useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [isApproved, setIsApproved] = React.useState<boolean>(true);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (!u) {
        setIsAdmin(false);
        setIsApproved(true);
        setFirstName(null);
        setAvatarUrl(null);
        setLoading(false);
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, "users", u.uid));
        const data = userSnap.exists() ? (userSnap.data() as any) : null;

        const name = typeof data?.firstName === "string" ? data.firstName.trim() : "";
        setFirstName(name.length > 0 ? name : null);

        const avatar = typeof data?.avatarUrl === "string" ? data.avatarUrl.trim() : "";
        setAvatarUrl(avatar.length > 0 ? avatar : null);

        // Approval gate:
        // - approved === false => NOT approved
        // - approved missing/true => approved
        const approvedRaw = data?.approved;
        const approved = approvedRaw !== false;
        setIsApproved(approved);

        try {
          // Fast path: docId == uid
          const adminSnap = await getDoc(doc(db, "admins", u.uid));
          if (adminSnap.exists()) {
            setIsAdmin(true);
          } else {
            // Fallback: admins docs might store uid/email as fields
            const emailLower = (u.email ?? "").toLowerCase();
            const adminsRef = collection(db, "admins");

            const [byUidSnap, byEmailSnap] = await Promise.all([
              getDocs(query(adminsRef, where("uid", "==", u.uid), limit(1))),
              emailLower ? getDocs(query(adminsRef, where("email", "==", emailLower), limit(1))) : Promise.resolve(null as any),
            ]);

            const isAdminByUid = !!byUidSnap && !byUidSnap.empty;
            const isAdminByEmail = !!byEmailSnap && !!byEmailSnap.empty === false;

            setIsAdmin(isAdminByUid || isAdminByEmail);
          }
        } catch {
          setIsAdmin(false);
        }
      } catch {
        setIsAdmin(false);
        setIsApproved(true);
        setFirstName(null);
        setAvatarUrl(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  return { user, loading, isAdmin, isApproved, firstName, avatarUrl };
}