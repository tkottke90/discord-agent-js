# LLM Worker

This directory contains code for our LLM Workers. The core working concept of the worker design is that LLM Calls (and by proxy Agentic Pipelines) are asynchronous. This has potential impacts on the server's ability to receive and process requests because once those request have completed they need to wait to for the main thread to be available to pick up the promise and continue processing them.

<br/>

![alt text](/docs/images//worker-flow-diagram.png)

To get around this the application implements a _Worker Pool_ and a _Job System_. This allows request to flow into a queue and be processed on a different thread by a worker when available.

## Worker Setup

Workers are created by the _Worker Pool_ by creating NodeJS Worker Threads. These threads spin up new processes with a shared messaging channel back to the pool.

To initialize a worker we need to pull some information from the configuration file:

1. The LLM Client Configurations - These allow the LLM to configure clients for different engines (OpenAI, Gemini, Ollama, etc)
2. The Redis Configuration - This allows the worker to manage details about the job it is working on.

## Jobs

Workers work on Jobs which have been submitted to the _Worker Pool_. Each job has the following attributes:

1. `jobId` - A unique identifier for the job
2. `data` - The data for the job
3. `task` - The task to be performed by the worker
4. `priority` - The priority of the job
5. `createdAt` - The timestamp when the job was created

The _Worker Pool_ hands out jobs based on a first-in-first-out basis. However, jobs can be prioritized by setting the `priority` field to a higher number. Jobs with the same priority are processed in the order they were created. This dual priority system allows us to ensure that high priority jobs are processed first, but also that jobs are processed in a fair manner.

## Worker Execution

