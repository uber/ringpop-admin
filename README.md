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

```
  Usage: admin-cluster-state [options]

  Options:

    -h, --help              output usage information
    -m, --member <address>  Address of member
```

## member-state

```
  Usage: admin-member-state [options]

  Options:

    -h, --help              output usage information
    -m, --member <address>  Address of member. If left blank, queries state of all members.
    -s, --sort <field>      Sort ascending by field. One of address, status, incarnationNumber.
```
