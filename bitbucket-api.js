const getAllBranches = async ({ workspace, repoSlug, token }) => {
  const response = await fetch(
    `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/refs/branches`, 
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Bitbucket API throws error: ${response.status}`)
  }

  return await response.json();
}

const createPr = async ({ workspace, repoSlug, token }, { sourceBranch, destinationBranch, title, summary }) => {
  const payload = {
    title,
    source: {
      branch: {
        name: sourceBranch,
      },
    },
    destination: {
      branch: {
        name: destinationBranch,
      },
    },
    summary: {
      raw: summary,
    },
  }

  const response = await fetch(
    `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/pullrequests`, 
    {
      method: 'POST',
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    console.error('ERROR:', await response.json());

    throw new Error(`Bitbucket API throws error: ${response.status}`)
  }

  return await response.json();
}

export { getAllBranches, createPr };