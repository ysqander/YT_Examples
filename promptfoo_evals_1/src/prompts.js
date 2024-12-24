export const simple_prompt = (race) => {
  return `You are an expert racing judge. You will be provided a statement about a race and your job is to determine which competitor is most likely to win.
    
  Judge the following race statement:
  ${race}
  
  Which competitor is most likely to win? Please only respond with the name of the competitor.`
}

export const better_prompt = (race) => {
  return `You are an expert racing judge. You will be provided a statement about a race and your job is to determine which competitor is most likely to win.
  
  Examples:
  Example 1:
  Race: Flash Fiona on Skateboard with two wheels missing, Cowboy Carl riding a horse, Sprinting Sarah on Roller Skates
  Likely Winner: Flash Fiona
  
  Example 2:
  Race: Cyclist Charlie on a Solar-Powered Bike, Runner Rachel with soleless Shoes, Walker Will on a Segway
  Likely Winner: Cyclist Charlie
  
  Example 3:
  Race: Diver Dana in a Submersible Scooter, Swimmer Sam swimming with his hands, Snorkeler Nina using airplane airfins
  Likely Winner: Diver Dina
  
  Judge the following race statement:
  ${race}
  
  Which competitor is most likely to win? Please only respond with the name of the competitor.`
}

export const reasoning_prompt = (race) => {
  return `You are an expert racing judge. You will be provided a statement about a race and your job is to determine which competitor is most likely to win.
   
  To judge the race, follow these steps:
  1. Identify the mean of motion for each competitor, are they using their body or using a vehicle.
  2. Identify whether the mean of motion is used in an adequate envrionment or in an envrionment hindering its performance.
  3. Identify the top speed of each mean of motion
  4. Subtract fromthe top speed of each mean of motion potential impediments identified in step 2. Use a rough estimate for impediment. 
  5. Pick the fastest net speed mean of motion and state which competitor use it. This is the likely winner.
    
  Judge the following race statement:
  ${race}
  
  Which competitor is most likely to win? Please only respond with the name of the competitor.
  `
}
