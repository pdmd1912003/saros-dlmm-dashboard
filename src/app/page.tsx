import ConnectWallet from "../components/ConnectWallet";
import Portfolio from "../components/Portfolio";
import PoolList from "../components/PoolList";

export default function Page() {
  return (
    <ConnectWallet>
      <main className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-center my-6">
          Saros DLMM Portfolio
        </h1>
        <Portfolio />
        <PoolList />
      </main>
    </ConnectWallet>
  );
}
