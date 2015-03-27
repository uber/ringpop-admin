# ringpop-admin
An admin tool for ringpop

# Usage

```
  Usage: admin [options] [command]


  Commands:

    cluster-state   Query state of cluster. See cluster-state --help for details.
    join <node>     causes node to join the cluster
    leave <node>    causes node to leave the cluster
    member-state    Query state of member. See member-state --help for details.
    help [cmd]      display help for [cmd]

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
```

## cluster-state
Queries instance at `hostPort` for all membership information. Uses that information to then query all other members. Reports if all members have converged on a single checksum and formed 1 cluster.

```
  Usage: admin-cluster-state [options] <hostPort>

  Options:

    -h, --help  output usage information
```

## member-state
Queries instance at `hostPort` for membership state.

```
  Usage: admin-member-state [options] <hostPort>

  Options:

    -h, --help              output usage information
    -m, --member <hostPort> Address of member. If not provided, reports state of all members.
    -s, --sort <field>      Sort ascending by field. One of address, status, incarnationNumber.
```
