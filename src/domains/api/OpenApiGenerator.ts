export class OpenApiGenerator {
  /**
   * Generates a fully valid, detailed OpenAPI 3.1.0 / Swagger JSON specification document.
   */
  public generateSpec(): Record<string, any> {
    return {
      openapi: "3.1.0",
      info: {
        title: "Aziz AI Unified Platform API",
        description: "Production-grade, enterprise-ready unified API platform exposing SPRINT 21 AI orchestration, BPE, and recruitment modules.",
        version: "1.0.0",
        contact: {
          name: "Aziz Engineering Support",
          email: "support@aziz.ai"
        }
      },
      servers: [
        {
          url: "/api/v1",
          description: "Production Version 1 Gateway"
        }
      ],
      paths: {
        "/recruitment/assess": {
          post: {
            summary: "Assess Candidate",
            description: "Assess a single candidate profile against a job description utilizing core semantic and risk metrics.",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      candidate: { $ref: "#/components/schemas/CandidateProfile" },
                      job: { $ref: "#/components/schemas/JobDescription" },
                      options: { $ref: "#/components/schemas/AssessmentOptions" }
                    },
                    required: ["candidate", "job"]
                  }
                }
              }
            },
            responses: {
              "200": {
                description: "Assessment successful",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/StandardResponse" }
                  }
                }
              },
              "400": { description: "Bad Request" },
              "500": { description: "Internal Server Error" }
            }
          }
        },
        "/recruitment/workflow/start": {
          post: {
            summary: "Start Recruitment Workflow",
            description: "Initiates a multi-candidate recruitment ranking and shortlisting process.",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      submissions: {
                        type: "array",
                        items: { $ref: "#/components/schemas/CandidateSubmission" }
                      },
                      job: { $ref: "#/components/schemas/JobDescription" },
                      options: { $ref: "#/components/schemas/WorkflowOptions" }
                    },
                    required: ["submissions", "job"]
                  }
                }
              }
            },
            responses: {
              "200": { description: "Workflow started successfully" },
              "400": { description: "Bad Request" }
            }
          }
        },
        "/recruitment/workflow/pause": {
          post: {
            summary: "Pause Recruitment Workflow",
            description: "Pauses an active recruitment workflow.",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      workflowId: { type: "string" }
                    },
                    required: ["workflowId"]
                  }
                }
              }
            },
            responses: {
              "200": { description: "Workflow paused successfully" },
              "404": { description: "Workflow not found" }
            }
          }
        },
        "/recruitment/workflow/resume": {
          post: {
            summary: "Resume Recruitment Workflow",
            description: "Resumes a paused recruitment workflow.",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      workflowId: { type: "string" }
                    },
                    required: ["workflowId"]
                  }
                }
              }
            },
            responses: {
              "200": { description: "Workflow resumed successfully" },
              "404": { description: "Workflow not found" }
            }
          }
        },
        "/recruitment/workflow/cancel": {
          post: {
            summary: "Cancel Recruitment Workflow",
            description: "Cancels an active recruitment workflow.",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      workflowId: { type: "string" }
                    },
                    required: ["workflowId"]
                  }
                }
              }
            },
            responses: {
              "200": { description: "Workflow cancelled successfully" },
              "404": { description: "Workflow not found" }
            }
          }
        },
        "/recruitment/workflow/{id}": {
          get: {
            summary: "Get Recruitment Workflow State",
            description: "Retrieves the full structural state and rankings of a recruitment workflow.",
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string" }
              }
            ],
            responses: {
              "200": { description: "Workflow state retrieved successfully" },
              "404": { description: "Workflow not found" }
            }
          }
        },
        "/process/start": {
          post: {
            summary: "Start Business Process",
            description: "Deploys and starts a new generic Business Process Engine (BPE) process instance.",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      definitionId: { type: "string" },
                      initialContext: { type: "object" },
                      version: { type: "integer" }
                    },
                    required: ["definitionId"]
                  }
                }
              }
            },
            responses: {
              "200": { description: "Process initiated" }
            }
          }
        },
        "/process/pause": {
          post: {
            summary: "Pause Business Process",
            description: "Safely pauses a running process flow at its nearest stage checkpoint.",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      instanceId: { type: "string" }
                    },
                    required: ["instanceId"]
                  }
                }
              }
            },
            responses: {
              "200": { description: "Process paused successfully" }
            }
          }
        },
        "/process/resume": {
          post: {
            summary: "Resume Business Process",
            description: "Resumes a paused process flow, picking up from its stored checkpoint.",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      instanceId: { type: "string" }
                    },
                    required: ["instanceId"]
                  }
                }
              }
            },
            responses: {
              "200": { description: "Process resumed successfully" }
            }
          }
        },
        "/process/retry": {
          post: {
            summary: "Retry Failed Stage",
            description: "Retries a specific failed process stage.",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      instanceId: { type: "string" },
                      stageId: { type: "string" }
                    },
                    required: ["instanceId", "stageId"]
                  }
                }
              }
            },
            responses: {
              "200": { description: "Stage retry triggered successfully" }
            }
          }
        },
        "/process/cancel": {
          post: {
            summary: "Cancel Business Process",
            description: "Aborts an active process instance immediately.",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      instanceId: { type: "string" }
                    },
                    required: ["instanceId"]
                  }
                }
              }
            },
            responses: {
              "200": { description: "Process cancelled successfully" }
            }
          }
        },
        "/process/{id}": {
          get: {
            summary: "Get Process Instance State",
            description: "Retrieves complete audit logs and contextual state of a process instance.",
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string" }
              }
            ],
            responses: {
              "200": { description: "Process state retrieved successfully" }
            }
          }
        },
        "/health": {
          get: {
            summary: "Health Check",
            description: "Verifies gateway routing and service availability.",
            responses: {
              "200": { description: "Service is healthy" }
            }
          }
        },
        "/version": {
          get: {
            summary: "API Version",
            description: "Retrieves active REST API and server gateway versions.",
            responses: {
              "200": { description: "Version payload" }
            }
          }
        },
        "/build": {
          get: {
            summary: "Build Information",
            description: "Retrieves software compilation, deployment build number, and target environment details.",
            responses: {
              "200": { description: "Build payload" }
            }
          }
        },
        "/status": {
          get: {
            summary: "System Status Metrics",
            description: "Aggregates real-time SRE metrics, counting total requests, errors, active flows, and latencies.",
            responses: {
              "200": { description: "Telemetry report payload" }
            }
          }
        }
      },
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT"
          },
          ApiKeyAuth: {
            type: "apiKey",
            in: "header",
            name: "X-API-Key"
          }
        },
        schemas: {
          CandidateProfile: {
            type: "object",
            properties: {
              name: { type: "string" },
              skills: { type: "array", items: { type: "string" } },
              experienceYears: { type: "integer" },
              experienceSummary: { type: "string" },
              resumeText: { type: "string" }
            },
            required: ["name", "skills", "experienceYears"]
          },
          JobDescription: {
            type: "object",
            properties: {
              title: { type: "string" },
              requiredSkills: { type: "array", items: { type: "string" } },
              minimumExperienceYears: { type: "integer" },
              descriptionText: { type: "string" }
            },
            required: ["title", "requiredSkills", "minimumExperienceYears"]
          },
          AssessmentOptions: {
            type: "object",
            properties: {
              correlationId: { type: "string" },
              timeoutMs: { type: "integer" }
            }
          },
          CandidateSubmission: {
            type: "object",
            properties: {
              candidate: { $ref: "#/components/schemas/CandidateProfile" },
              version: { type: "integer" },
              recruiterNotes: { type: "string" }
            },
            required: ["candidate"]
          },
          WorkflowOptions: {
            type: "object",
            properties: {
              correlationId: { type: "string" },
              shortlistThreshold: { type: "integer" },
              timeoutMs: { type: "integer" }
            }
          },
          StandardResponse: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              requestId: { type: "string" },
              timestamp: { type: "string" },
              version: { type: "string" },
              data: { type: "object", nullable: true },
              errors: { type: "array", items: { type: "string" } },
              warnings: { type: "array", items: { type: "string" } },
              executionMetrics: {
                type: "object",
                properties: {
                  apiLatencyMs: { type: "number" },
                  processLatencyMs: { type: "number" }
                }
              }
            }
          }
        }
      }
    };
  }

  /**
   * Outputs the Swagger JSON string representation.
   */
  public swaggerJson(): string {
    return JSON.stringify(this.generateSpec(), null, 2);
  }
}
