import { Octokit } from "octokit";
import { env } from "process";

// Pro tip: Generate a personal access token!
const octokit = new Octokit({ auth: env.API_KEY, userAgent: "toiv0.1.0" });

interface GitHubFileRequest {
  owner: string;
  repoName: string;
  path: string;
  branch: string;
}

export const graphql = (request: string) => octokit.graphql(request);

/** Function to build query for GitHub to get latest commit date */
export const createRequest = (request: GitHubFileRequest) => `{
  repository(owner: "${request.owner}", name: "${request.repoName}") {
    ref(qualifiedName: "refs/heads/${request.branch}") {
      target {
        ... on Commit {
          history(first: 1, path: "${request.path}") {
            edges {
              node {
                committedDate
              }
            }
          }
        }
      }
    }
  }
}`;
