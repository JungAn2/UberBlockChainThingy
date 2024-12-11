import { useWallet } from "./WalletContext";
import { Button } from "react-native";
import { useRouter } from "expo-router";

export default function SignOut() {
    const { setWalletAddress } = useWallet();
    const router = useRouter();
    
    const handleLogout = () => {
        setWalletAddress('');
        router.push('signIn');
    };
    
    return (
        <Button title="Sign Out" onPress={handleLogout} />
    );
}
