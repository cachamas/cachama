export default function Lights() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1.2}
      />
      <hemisphereLight
        intensity={0.4}
        color="#eaeaea"
        groundColor="#353535"
      />
      <pointLight position={[0, 10, 0]} intensity={0.5} />
    </>
  );
} 