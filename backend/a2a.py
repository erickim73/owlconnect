class Agent:
    """
    A simple class to represent an agent in a communication chain.
    """
    def __init__(self, name: str, next_agent=None):
        """
        Initializes the agent.

        Args:
            name (str): The name of this agent.
            next_agent (Agent, optional): The next agent in the chain to pass messages to. 
                                         Defaults to None.
        """
        self.name = name
        self.next_agent = next_agent
        self.message_storage = None

    def receive_message(self, message: str, sender_name: str):
        """
        Receives a message, stores it, and passes it on if possible.
        """
        print(f"--- {self.name} has received a message from {sender_name}. ---")
        self.message_storage = message
        print(f"'{self.message_storage}'")
        
        if self.next_agent:
            print(f"Passing the message along to {self.next_agent.name}...\n")
            self.pass_message()
        else:
            print("--- This is the final agent. Communication chain complete. ---\n")

    def pass_message(self):
        """
        Passes its stored message to the next agent in the chain.
        """
        if self.next_agent and self.message_storage:
            self.next_agent.receive_message(self.message_storage, self.name)
        else:
            # This case would be hit if an agent tries to pass a message 
            # without a next_agent defined.
            print(f"{self.name} has nowhere to pass the message.")


# --- Main Execution ---
if __name__ == "__main__":
    
    # 1. Define the paragraph of text to be passed.
    paragraph_to_send = (
        "Project Sentinel is a go. The primary objective is to deploy the "
        "orbital sensors by 0400 hours. All ground teams must confirm their "
        "readiness status within the next hour. Secondary protocols are to "
        "be initiated only upon direct command from Control. Acknowledge receipt."
    )

    # 2. Create the agents, linking them in reverse order.
    #    Agent 3 is the end of the chain.
    agent_charlie = Agent(name="Agent Charlie")
    
    #    Agent 2 will pass messages to Agent 3.
    agent_bravo = Agent(name="Agent Bravo", next_agent=agent_charlie)
    
    #    Agent 1 will start the chain and pass messages to Agent 2.
    agent_alpha = Agent(name="Agent Alpha", next_agent=agent_bravo)

    print(">>> Starting A2A Communication Chain <<<\n")
    
    # 3. Kick off the process by sending the initial message to the first agent.
    #    The sender is the "System" or the initial user.
    agent_alpha.receive_message(paragraph_to_send, sender_name="System Control")
