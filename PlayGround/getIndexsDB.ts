import clientPromise from "../db/mongodb";

const run = async () => {

  const client = await clientPromise;
  const collection = client.db("langchain").collection("memory");

  const result = await collection.indexes()

  console.log(result);

}

export default run;