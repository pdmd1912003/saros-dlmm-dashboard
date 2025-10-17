import ConnectWallet from "../components/ConnectWallet";
import Portfolio from "../components/Portfolio";
import PoolList from "../components/PoolList";

export default function Page() {
  return (
    <main className="w-full min-h-screen bg-background dark grid-neon scanlines">
      <ConnectWallet>
        <Portfolio />
        <PoolList />
      </ConnectWallet>
    </main>
  );
}
