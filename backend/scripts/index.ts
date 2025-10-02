import { sarosDLMM } from "../service/sarosService"


async function explorePools() {
  try {
    const poolAddresses = await sarosDLMM.fetchPoolAddresses();
    console.log(`Dex name: ${sarosDLMM.getDexName()}`);
     
    console.log(`Found ${poolAddresses.length} pools:`);
    
    poolAddresses.slice(0, 5).forEach((address, index) => {
      console.log(`${index + 1}. ${address}`);
    });
    
    if (poolAddresses.length > 0) {
      const firstPoolAddress = "DFH7VBnDoJ6u8kk1zeVZ8EXsEzgx6YNMUDfcjTQ3dEFM";
      const poolMetadata = await sarosDLMM.fetchPoolMetadata(firstPoolAddress);
      console.log(`\nPool Details for ${firstPoolAddress}:`);
      console.log(`Base Token: ${poolMetadata.baseMint}`);
      console.log(`Quote Token: ${poolMetadata.quoteMint}`);
      console.log(`Base Reserve: ${poolMetadata.baseReserve}`);
      console.log(`Quote Reserve: ${poolMetadata.quoteReserve}`);
      console.log(`Trade Fee: ${poolMetadata.tradeFee}%`);
    }
    
  } catch (error) {
    console.error("Error fetching pools:", error);
  }
}

explorePools();