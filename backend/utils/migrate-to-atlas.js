const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const localUri = process.env.LOCAL_MONGODB_URI || 'mongodb://localhost:27017/sonecomxpro';
const atlasUri = process.argv[2] || process.env.ATLAS_MONGODB_URI;

if (!atlasUri) {
  console.error("❌ Erreur : Veuillez fournir l'URI MongoDB Atlas en paramètre.");
  console.error("Usage: node backend/utils/migrate-to-atlas.js \"mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/sonecomxpro?retryWrites=true&w=majority\"");
  process.exit(1);
}

async function migrate() {
  console.log("🔄 Connexion à MongoDB local...");
  const localConn = await mongoose.createConnection(localUri).asPromise();
  console.log("✅ Connecté à MongoDB local");

  console.log("🔄 Connexion à MongoDB Atlas...");
  const atlasConn = await mongoose.createConnection(atlasUri).asPromise();
  console.log("✅ Connecté à MongoDB Atlas");

  const collections = await localConn.db.listCollections().toArray();
  console.log(`📦 ${collections.length} collection(s) à migrer...`);

  for (const colInfo of collections) {
    const colName = colInfo.name;
    if (colName.startsWith('system.')) continue;

    const localCol = localConn.db.collection(colName);
    const atlasCol = atlasConn.db.collection(colName);

    const docs = await localCol.find({}).toArray();
    console.log(`\n➡️  Collection [${colName}] : ${docs.length} documents`);

    if (docs.length > 0) {
      await atlasCol.deleteMany({});
      const insertResult = await atlasCol.insertMany(docs);
      console.log(`   ✅ ${insertResult.insertedCount} documents transférés avec succès dans [${colName}].`);
    } else {
      console.log(`   ℹ️  Collection vide, ignorée.`);
    }
  }

  console.log("\n🎉 Migration terminée avec succès ! Toutes les données sont maintenant sur MongoDB Atlas.");
  await localConn.close();
  await atlasConn.close();
  process.exit(0);
}

migrate().catch(err => {
  console.error("❌ Erreur lors de la migration :", err);
  process.exit(1);
});
